import CharacterViewer from "../components/CharacterViewer";

export default function CharacterCustomizePage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        background: "#111",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "70%",
          maxWidth: "1200px",
          height: "100vh",
        }}
      >
        {/* 좌측 영역 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "700px", padding: "20px" }}>
            <h1 style={{ color: "white", marginBottom: "20px" }}>
              3D 캐릭터 제작소
            </h1>

            {[
              "피부색 선택",
              "헤어스타일",
              "의상 선택",
              "액세서리",
              "포즈",
              "배경",
            ].map((title) => (
              <div
                key={title}
                style={{
                  background: "white",
                  borderRadius: "10px",
                  padding: "20px",
                  marginBottom: "20px",
                }}
              >
                <h3>{title}</h3>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "80px",
                        height: "80px",
                        background: "#ddd",
                        borderRadius: "8px",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측 영역 */}
        <div
          style={{
            width: "350px",
            background: "#1e1e1e",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "300px",
              padding: "20px",
              color: "white",
            }}
          >
            <h3>미리보기</h3>

            <div
            style={{
                height: "300px",
                borderRadius: "10px",
                marginBottom: "20px",
                overflow: "hidden",
            }}
            >
            <CharacterViewer />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p>피부: light</p>
              <p>헤어: short</p>
              <p>의상: casual</p>
            </div>

            <button
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px",
              }}
            >
              초기화
            </button>

            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "purple",
                color: "white",
                border: "none",
              }}
            >
              캐릭터 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}